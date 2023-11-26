import click
from app.main import noaa_update

@click.command()
@click.option('--run-noaa-update', is_flag=True, help="Run the NOAA update task")
def cli(run_noaa_update):
    if run_noaa_update:
        noaa_update.delay()

if __name__ == "__main__":
    cli()