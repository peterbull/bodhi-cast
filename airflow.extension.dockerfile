FROM apache/airflow:2.8.1

# Install additional dependencies for ECCODES
USER root
RUN apt-get update --fix-missing && apt-get install -y libpq-dev gcc g++ wget \
    libnetcdff-dev libopenjp2-7-dev gfortran make unzip git cmake \
    && mkdir /root/source_builds \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /root
RUN mkdir -p source_builds/eccodes/build && mkdir -p /usr/src/eccodes

# Get ECCodes package
WORKDIR /root/source_builds/eccodes
RUN wget https://confluence.ecmwf.int/download/attachments/45757960/eccodes-2.31.0-Source.tar.gz?api=v2 && \
    tar -xzf eccodes-2.31.0-Source.tar.gz?api=v2 && \
    rm eccodes-2.31.0-Source.tar.gz?api=v2

# Build ECCodes from source
WORKDIR /root/source_builds/eccodes/build
RUN cmake -DCMAKE_INSTALL_PREFIX=/usr/src/eccodes -DENABLE_JPG=ON ../eccodes-2.31.0-Source && \
    make && \
    ctest && \
    make install && cp -r /usr/src/eccodes/bin/* /usr/bin

# Export ECCodes Paths
ENV ECCODES_DIR=/usr/src/eccodes
ENV ECCODES_DEFINITION_PATH=/usr/src/eccodes/share/eccodes/definitions

RUN cp $ECCODES_DIR/lib/libeccodes.so /usr/lib && \
    cp /usr/src/eccodes/include/* /usr/include/ 

# Install and check for correct install with pthyon
RUN apt-get update && apt-get install -y python3-pip && \
    pip3 install eccodes-python && \
    python3 -m eccodes selfcheck

# Install additional dependencies for project

USER airflow
WORKDIR /home/airflow