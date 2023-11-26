import click
from app.main import noaa_update, update_swell_data

@click.group()
def cli():
    """A group that holds a set of commands."""
    pass

@cli.command()
def run_noaa_update():
    """Run the NOAA update task."""
    noaa_update.delay()

@cli.command()
def run_swelldata_update():
    """Run the Open Meteo update task."""
    update_swell_data.delay()

if __name__ == "__main__":
    cli()
