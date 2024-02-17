import pendulum
from airflow.operators.bash import BashOperator

from airflow import DAG

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": pendulum.datetime(2024, 2, 1),
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": pendulum.duration(minutes=5),
}


with DAG(
    "delete_old_logs",
    default_args=default_args,
    description="Delete old dag logs",
    schedule_interval=None,
    catchup=False,
    is_paused_upon_creation=True,
) as dag:

    cleanup_command = """
find ~/bodhi-cast/airflow/logs -type f -mtime +7 -delete
    """

    cleanup_task = BashOperator(
        task_id="cleanup_logs",
        bash_command=cleanup_command,
    )
