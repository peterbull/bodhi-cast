use crate::{
    db::{Db, FollowLimit, spot},
    model::{NewSpot, Spot},
};
use anyhow::Result;
use serde::Serialize;
use tokio_postgres::Row;

#[derive(Debug)]
pub struct CustomSpotLimit;
impl std::fmt::Display for CustomSpotLimit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Your account has reached the limit of 100 custom spots")
    }
}
impl std::error::Error for CustomSpotLimit {}

#[derive(Debug, Clone, Serialize)]
pub struct Account {
    pub id: i64,
    pub email: String,
    pub name: String,
}

pub(crate) fn account(row: Row) -> Account {
    Account {
        id: row.get("id"),
        email: row.get("email"),
        name: row.get("name"),
    }
}

impl Db {
    pub async fn sign_in_account(&self, subject: &str, email: &str, name: &str) -> Result<Account> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        let created = tx.query_opt("INSERT INTO bodhi.users(google_subject,email,name) VALUES($1,$2,$3) ON CONFLICT(google_subject) DO NOTHING RETURNING *", &[&subject,&email,&name]).await?;
        let user = match created {
            Some(row) => {
                let user = account(row);
                tx.execute("INSERT INTO bodhi.user_follows(user_id,spot_id) SELECT $1,id FROM bodhi.spots WHERE watched AND owner_user_id IS NULL ORDER BY id LIMIT 20", &[&user.id]).await?;
                user
            }
            None => account(tx.query_one("UPDATE bodhi.users SET email=$2,name=$3,last_login_at=now() WHERE google_subject=$1 RETURNING *", &[&subject,&email,&name]).await?),
        };
        tx.commit().await?;
        Ok(user)
    }

    pub async fn spots_for(&self, user_id: Option<i64>) -> Result<Vec<Spot>> {
        Ok(self.pool.get().await?.query("SELECT s.id,s.spot_name,s.street_address,s.latitude,s.longitude,CASE WHEN $1::bigint IS NULL THEN s.watched ELSE EXISTS(SELECT 1 FROM bodhi.user_follows f WHERE f.user_id=$1 AND f.spot_id=s.id) END AS watched FROM bodhi.spots s WHERE s.owner_user_id IS NULL OR s.owner_user_id=$1 ORDER BY s.spot_name,s.id", &[&user_id]).await?.into_iter().map(spot).collect())
    }

    pub async fn spot_for(&self, id: i64, user_id: Option<i64>) -> Result<Option<Spot>> {
        Ok(self.pool.get().await?.query_opt("SELECT s.id,s.spot_name,s.street_address,s.latitude,s.longitude,CASE WHEN $2::bigint IS NULL THEN s.watched ELSE EXISTS(SELECT 1 FROM bodhi.user_follows f WHERE f.user_id=$2 AND f.spot_id=s.id) END AS watched FROM bodhi.spots s WHERE s.id=$1 AND (s.owner_user_id IS NULL OR s.owner_user_id=$2)", &[&id,&user_id]).await?.map(spot))
    }

    pub async fn set_personal_watch(
        &self,
        user_id: i64,
        id: i64,
        watched: bool,
    ) -> Result<Option<Spot>> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        tx.query_one(
            "SELECT id FROM bodhi.users WHERE id=$1 FOR UPDATE",
            &[&user_id],
        )
        .await?;
        let Some(row) = tx.query_opt("SELECT * FROM bodhi.spots WHERE id=$1 AND (owner_user_id IS NULL OR owner_user_id=$2)", &[&id,&user_id]).await? else { return Ok(None); };
        if watched {
            let count: i64 = tx
                .query_one(
                    "SELECT count(*) FROM bodhi.user_follows WHERE user_id=$1 AND spot_id<>$2",
                    &[&user_id, &id],
                )
                .await?
                .get(0);
            anyhow::ensure!(count < 20, FollowLimit);
            tx.execute("INSERT INTO bodhi.user_follows(user_id,spot_id) VALUES($1,$2) ON CONFLICT DO NOTHING", &[&user_id,&id]).await?;
        } else {
            tx.execute(
                "DELETE FROM bodhi.user_follows WHERE user_id=$1 AND spot_id=$2",
                &[&user_id, &id],
            )
            .await?;
        }
        let mut result = spot(row);
        result.watched = watched;
        tx.commit().await?;
        Ok(Some(result))
    }

    pub async fn add_personal_spot(&self, user_id: i64, new: &NewSpot) -> Result<Spot> {
        let mut conn = self.pool.get().await?;
        let tx = conn.transaction().await?;
        tx.query_one(
            "SELECT id FROM bodhi.users WHERE id=$1 FOR UPDATE",
            &[&user_id],
        )
        .await?;
        let existing = tx.query_opt("SELECT * FROM bodhi.spots WHERE (owner_user_id IS NULL OR owner_user_id=$1) AND lower(spot_name)=lower($2) AND ST_DWithin(location,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography,1) ORDER BY owner_user_id NULLS FIRST,id LIMIT 1", &[&user_id,&new.spot_name,&new.longitude,&new.latitude]).await?.map(spot);
        let existing_id = existing.as_ref().map(|s| s.id);
        let count:i64 = tx.query_one("SELECT count(*) FROM bodhi.user_follows WHERE user_id=$1 AND ($2::bigint IS NULL OR spot_id<>$2)", &[&user_id,&existing_id]).await?.get(0);
        anyhow::ensure!(count < 20, FollowLimit);
        let mut result = match existing {
            Some(value) => value,
            None => {
                let count: i64 = tx
                    .query_one(
                        "SELECT count(*) FROM bodhi.spots WHERE owner_user_id=$1",
                        &[&user_id],
                    )
                    .await?
                    .get(0);
                anyhow::ensure!(count < 100, CustomSpotLimit);
                spot(tx.query_one("INSERT INTO bodhi.spots(spot_name,street_address,latitude,longitude,owner_user_id) VALUES($1,$2,$3,$4,$5) RETURNING *", &[&new.spot_name,&new.street_address,&new.latitude,&new.longitude,&user_id]).await?)
            }
        };
        tx.execute(
            "INSERT INTO bodhi.user_follows(user_id,spot_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
            &[&user_id, &result.id],
        )
        .await?;
        result.watched = true;
        tx.commit().await?;
        Ok(result)
    }
}
