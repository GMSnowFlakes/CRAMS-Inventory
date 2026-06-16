FROM gitpod/workspace-mysql

USER root

RUN apt-get update -qq \
    && apt-get install -y software-properties-common \
    && add-apt-repository ppa:ondrej/php -y \
    && apt-get update -qq \
    && apt-get install -y \
        php8.3 \
        php8.3-cli \
        php8.3-mysql \
        php8.3-mbstring \
        php8.3-xml \
        php8.3-curl \
        php8.3-zip \
        php8.3-bcmath \
        php8.3-intl \
        php8.3-gd \
        php8.3-tokenizer \
        unzip \
    && curl -sS https://getcomposer.org/installer | php \
    && mv composer.phar /usr/local/bin/composer \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER gitpod
