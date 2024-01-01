import click
from app.main import delete_old_wave_forecasts, noaa_sample, noaa_update

"""
This script provides a command line interface (CLI) for running Celery tasks related to NOAA data processing. 
It includes commands for updating NOAA data and fetching NOAA samples.

To use this CLI:
1. Execute into a Docker container.
2. Navigate to the `scripts` directory.
3. Run `python celery_tasks.py [COMMAND] [OPTIONS]`

Examples:
- Update NOAA data: `python celery_tasks.py run-noaa-update`
- Fetch NOAA samples: `python celery_tasks.py run-noaa-sample --num-samples 24`

Commands:
- run-noaa-update: Runs the task to update NOAA data.
- run-noaa-sample: Runs the task to fetch NOAA samples. 

Options for 'run-noaa-sample':
- --num-samples: Specifies the number of samples to fetch. Defaults to 1 if not specified.

Each command invokes a Celery task to perform the desired operation asynchronously.
"""


@click.group()
def cli():
    """CLI for managing NOAA data processing tasks."""
    pass


@cli.command()
def run_noaa_update():
    """Run the NOAA data update task. This task updates the NOAA dataset."""
    noaa_update.delay()


@cli.command()
@click.option("--num-samples", default=1, help="Specify the number of NOAA samples to fetch.")
def run_noaa_sample(num_samples):
    """
    Run the NOAA sample fetch task.
    This task fetches a specified number of samples from NOAA asynchronously.
    """
    noaa_sample.delay(num_samples)


@cli.command()
def purge_old_entries():
    delete_old_wave_forecasts.delay()


if __name__ == "__main__":
    cli()
