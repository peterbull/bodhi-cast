import click
from app.main import noaa_update

@click.group()
def cli():
    """A group that holds a set of commands."""
    pass

@cli.command()
def run_noaa_update():
    """Run the NOAA update task."""
    noaa_update.delay()

if __name__ == "__main__":
    cli()
