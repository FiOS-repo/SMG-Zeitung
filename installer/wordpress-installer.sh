#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}$1${NC}"
}

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

print_message "Updating system..."
apt-get update && apt-get upgrade -y

print_message "Installing required packages..."
apt-get install -y apache2 \
                  mysql-server \
                  php \
                  php-mysql \
                  php-curl \
                  php-gd \
                  php-mbstring \
                  php-xml \
                  php-xmlrpc \
                  php-soap \
                  php-intl \
                  php-zip

print_message "Configuring Apache..."
a2enmod rewrite
systemctl restart apache2

print_message "Downloading WordPress..."
cd /tmp
wget https://wordpress.org/latest.tar.gz
tar -zxvf latest.tar.gz
cp -R wordpress/* /var/www/html/
chown -R www-data:www-data /var/www/html/
chmod -R 755 /var/www/html/

print_message "Setting up database..."
DB_NAME="wordpress"
DB_USER="wordpressuser"
DB_PASS=$(openssl rand -base64 12)

mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Configure wp-config.php
print_message "Configuring WordPress..."
cp /var/www/html/wp-config-sample.php /var/www/html/wp-config.php
sed -i "s/database_name_here/${DB_NAME}/" /var/www/html/wp-config.php
sed -i "s/username_here/${DB_USER}/" /var/www/html/wp-config.php
sed -i "s/password_here/${DB_PASS}/" /var/www/html/wp-config.php

# Generate and set security keys
SALT=$(curl -s https://api.wordpress.org/secret-key/1.1/salt/)
SALT_FILE="/tmp/wp-keys.txt"
echo "${SALT}" > "${SALT_FILE}"
sed -i '/#@-/,/#@+/c\'"$(cat ${SALT_FILE})" /var/www/html/wp-config.php
rm "${SALT_FILE}"


# Clean up
print_message "Cleaning up..."
rm /var/www/html/index.html
rm -rf /tmp/wordpress
rm /tmp/latest.tar.gz

print_message "WordPress installation completed!"
echo -e "${GREEN}Database Name: ${NC}${DB_NAME}"
echo -e "${GREEN}Database User: ${NC}${DB_USER}"
echo -e "${GREEN}Database Password: ${NC}${DB_PASS}"
echo -e "${GREEN}Please save these credentials${NC}"
echo -e "${GREEN}Access your WordPress installation at: http://your-server-ip${NC}"