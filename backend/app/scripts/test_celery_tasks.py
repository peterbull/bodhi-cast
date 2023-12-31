import click
from app.main import noaa_sample, noaa_sample_swell_only, noaa_update, noaa_update_swell_only


@click.group()
def cli():
    """A group that holds a set of commands."""
    pass


@cli.command()
def run_noaa_update():
    """Run the NOAA update task."""
    noaa_update.delay()


@cli.command()
@click.option("--num-samples", default=1, help="Number of samples to fetch`")
def run_noaa_sample(num_samples):
    """
    Runs the NOAA sample task asynchronously using Celery.
    """
    noaa_sample.delay(num_samples)


@cli.command()
def run_noaa_update_swell_only():
    """Run the NOAA update task with swell_only flag set to True.

    This function triggers the NOAA update task with the swell_only flag set to True.
    The task is executed asynchronously using Celery's delay() method.
    """
    noaa_update_swell_only.delay()


@cli.command()
def run_noaa_sample_swell_only():
    """
    Runs the NOAA sample task asynchronously using Celery.

    This function triggers the NOAA sample task with the swell_only flag set to True.
    """
    noaa_sample_swell_only.delay()


if __name__ == "__main__":
    cli()
