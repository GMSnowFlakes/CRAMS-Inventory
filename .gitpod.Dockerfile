FROM gitpod/workspace-mysql

# PHP 8.3
RUN sudo apt-get update && sudo apt-get install -y \
    software-properties-common \
    && sudo add-apt-repository ppa:ondrej/php -y \
    && sudo apt-get update \
    && sudo apt-get install -y \
    php8.3 \
    php8.3-cli \
    php8.3-fpm \
    php8.3-mysql \
    php8.3-mbstring \
    php8.3-xml \
    php8.3-curl \
    php8.3-zip \
    php8.3-bcmath \
    php8.3-intl \
    php8.3-gd \
    unzip \
    && sudo apt-get clean

# Composer
RUN curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer

# Node 20 (via nvm, already in gitpod/workspace-base)
RUN bash -c "source /home/gitpod/.nvm/nvm.sh && nvm install 20 && nvm alias default 20"
