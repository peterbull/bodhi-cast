## To Do:

## Long-Term:

### Frontend:

- [ ] Add user auth
- [ ] Add user spot creation pin drop
- [ ] Add zoom to areas with no spots on globe component
- [ ] Add brief instructions on pages where needed
- [ ] Change marker system on globe component
- [ ] Add zoom to areas with no spots on globe component
- [ ] Add brief instructions on pages where needed
- [ ] Change marker system on globe component

### Backend:

- [ ] Get tide forecast
- [ ] Get shore wind forecast
- [x] Change data fetching utils to classes
- [x] Add tests for all endpoints
- [ ] Add API auth
- [ ] Add user spot creation endpoint

### Airflow:

### Week Ending 240121

- [x] Add basic wave visualization component in three.js using `swh` data

### Week Ending 240128

- [ ] Migrate data pipeline to airflow
  - [x] Downgrade to SQLAlchemy 1.4
  - [x] Merge Docker compose services with airflow
  - [x] Extend airflow image to correctly install ECCodes for use of cfgrib engine in data processing
  - [ ] Configure DAGs for production
  - [ ] Set up env for production
  - [ ] Add auto tests for data verification as DAGs
