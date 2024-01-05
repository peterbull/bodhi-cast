# Use an official Python runtime as a parent image
FROM python:3.10.12-slim


# Install system dependencies required for psycopg2 and wget
RUN apt-get update && apt-get install -y libpq-dev gcc wget && \
    rm -rf /var/lib/apt/lists/*

# Install Miniconda
ENV MINICONDA_VERSION=latest
ENV CONDA_DIR=/opt/conda
ENV PATH=$CONDA_DIR/bin:$PATH

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh \
    && mkdir -p $CONDA_DIR \
    && sh Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh -b -u -p $CONDA_DIR \
    && rm -f Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh

# Install mamba to save memory on build in droplet
RUN conda install -c conda-forge mamba

# Install cfgrib and eccodes using Conda
RUN mamba install -c conda-forge cfgrib

# Install Poetry
ENV POETRY_VERSION=1.7.0
RUN pip install "poetry==$POETRY_VERSION"

# Set the working directory in the container
WORKDIR /usr/src/app

# Set the PYTHONPATH to include the directory set in WORKDIR
ENV PYTHONPATH /usr/src/app

# Copy Poetry configuration files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# Copy the rest of your application's code
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

