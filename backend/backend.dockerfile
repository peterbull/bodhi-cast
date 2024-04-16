# Use an official Python runtime as a parent image
FROM python:3.10.12-slim


# Install system dependencies required for psycopg2 and wget
RUN apt-get update && apt-get install -y libpq-dev gcc wget curl && \
    rm -rf /var/lib/apt/lists/*

# Install Miniconda
ENV MINICONDA_VERSION=py310_24.1.2-0
ENV CONDA_DIR=/opt/conda
ENV PATH=$CONDA_DIR/bin:$PATH

RUN wget https://repo.anaconda.com/miniconda/Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh \
    && mkdir -p $CONDA_DIR \
    && sh Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh -b -u -p $CONDA_DIR \
    && rm -f Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh

# Install cfgrib and eccodes using Conda, this is somewhat redudant,
# but the only way the cfgrib library installs correctly for xarray that I've found
# All suggestions to eliminate are welcome
RUN conda install -c conda-forge cfgrib

ENV POETRY_VERSION=1.7.0
RUN pip install "poetry==$POETRY_VERSION"

WORKDIR /usr/src/app

ENV PYTHONPATH /usr/src/app

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

COPY . .

EXPOSE 8000

