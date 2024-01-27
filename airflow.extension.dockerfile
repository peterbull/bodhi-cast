FROM apache/airflow:2.8.1

# Install additional dependencies for ECCODES
USER root
RUN apt-get update --fix-missing && apt-get install -y libpq-dev gcc g++ wget && \
    rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y libnetcdff-dev libopenjp2-7-dev gfortran make unzip git cmake wget \
    && mkdir /root/source_builds \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && cd \
    && mkdir -p source_builds \
    && cd source_builds && \
    mkdir eccodes && \
    cd eccodes && \
    wget https://confluence.ecmwf.int/download/attachments/45757960/eccodes-2.31.0-Source.tar.gz?api=v2 && \
    tar -xzf eccodes-2.31.0-Source.tar.gz?api=v2 && \
    rm eccodes-2.31.0-Source.tar.gz?api=v2 && \
    mkdir -p build && \
    cd build && \
    mkdir /usr/src/eccodes && \
    cmake -DCMAKE_INSTALL_PREFIX=/usr/src/eccodes -DENABLE_JPG=ON ../eccodes-2.31.0-Source && \
    make && \
    ctest && \
    make install && cp -r /usr/src/eccodes/bin/* /usr/bin

# RUN echo 'export ECCODES_DIR=/usr/src/eccodes' >> ~/.bashrc && \
#     echo 'export ECCODES_DEFINITION_PATH=/usr/src/eccodes/share/eccodes/definitions' >> ~/.bashrc && \
#     source ~/.bashrc
ENV ECCODES_DIR=/usr/src/eccodes
ENV ECCODES_DEFINITION_PATH=/usr/src/eccodes/share/eccodes/definitions

RUN cp $ECCODES_DIR/lib/libeccodes.so /usr/lib && \
    cp /usr/src/eccodes/include/* /usr/include/ 

RUN apt-get update && apt-get install -y python3-pip && \
    pip3 install eccodes-python && \
    python3 -m eccodes selfcheck

USER default