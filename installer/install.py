import os
import colorama
import platform
import distro
from halo import Halo
import time
import socket
import subprocess
import string
import secrets

def log(text):
    # write log
    with open("install.log", "a") as f:
        f.write(text + "\n")
    print(colorama.Fore.GREEN + "[i] " + text + colorama.Fore.RESET)

def fail(text):
    print(colorama.Fore.RED + "[x] " + text + colorama.Fore.RESET)

def generate_password(length=22):
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(characters) for i in range(length))
    return password

colorama.init()

print(colorama.Fore.BLUE + """
██████╗ ██╗███╗   ██╗ ██████╗ ██╗   ██╗██╗███╗   ██╗
██╔══██╗██║████╗  ██║██╔════╝ ██║   ██║██║████╗  ██║
██████╔╝██║██╔██╗ ██║██║  ███╗██║   ██║██║██╔██╗ ██║
██╔═══╝ ██║██║╚██╗██║██║   ██║██║   ██║██║██║╚██╗██║
██║     ██║██║ ╚████║╚██████╔╝╚██████╔╝██║██║ ╚████║
╚═╝     ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝
-----------------------------------------------------
Installations Skript für PINGUIN Zeitung
Kontakt finn.bartels@smgmail.de
""" + colorama.Fore.RESET)

# Check OS information
os_info = distro.name() + " " + distro.version()
print(colorama.Fore.GREEN + "[i] OS: " + os_info + colorama.Fore.RESET)

def check_internet(host="8.8.8.8", port=53, timeout=3):
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except socket.error as ex:
        print(ex)
        return False

# Check internet connection
spinner = Halo(text='Checking Network', spinner='dots')
spinner.start()

if check_internet():
    spinner.stop_and_persist(symbol='', text=colorama.Fore.GREEN + "[i] Internet Verbindung aufgebaut" + colorama.Fore.RESET)
else:
    spinner.stop_and_persist(symbol='', text=colorama.Fore.RED + "[x] Keine Internetverbindung" + colorama.Fore.RESET)
    exit()

# Check root privileges
if os.geteuid() == 0:
    print(colorama.Fore.GREEN + "[i] Root Rechte vorhanden" + colorama.Fore.RESET)
else:
    print(colorama.Fore.RED + "[x] Root Rechte benötigt" + colorama.Fore.RESET)
    exit()

print("")

start = input("Installation starten (Y/N): ")
if start.lower() == "y":
    pass
elif start.lower() == "n":
    print(colorama.Fore.RED + "[X] Skript Abgebrochen" + colorama.Fore.RESET)
    exit()
else:
    print(colorama.Fore.RED + "[X] Bitte wählen Sie Y/y oder N/n" + colorama.Fore.RESET)
    exit()

log("Installation gestartet")

# Update System
log("System wird aktualisiert")
spinner = Halo(text='Updating System', spinner='dots')
spinner.start()
try:
    subprocess.run(["apt", "update"], check=True)
    subprocess.run(["apt", "upgrade", "-y"], check=True)
    spinner.stop_and_persist(symbol='', text=colorama.Fore.GREEN + "[i] System aktualisiert" + colorama.Fore.RESET)
    log("System aktualisiert")
except subprocess.CalledProcessError:
    spinner.stop_and_persist(symbol='', text=colorama.Fore.RED + "[x] System konnte nicht aktualisiert werden" + colorama.Fore.RESET)
    log("System konnte nicht aktualisiert werden")
    exit()

# Check Docker
try:
    subprocess.run(["docker", "--version"], check=True)
    log("Docker ist installiert")
except subprocess.CalledProcessError:
    log("Docker ist nicht installiert")
    log("Docker wird installiert")
    spinner = Halo(text='Installing Docker', spinner='dots')
    spinner.start()
    try:
        # Use a single string command with shell=True for proper piping
        subprocess.run("curl -fsSL https://get.docker.com | sh", check=True, shell=True)
        spinner.stop_and_persist(symbol='', text=colorama.Fore.GREEN + "[i] Docker installiert" + colorama.Fore.RESET)
        log("Docker installiert")
    except subprocess.CalledProcessError:
        spinner.stop_and_persist(symbol='', text=colorama.Fore.RED + "[x] Docker konnte nicht installiert werden" + colorama.Fore.RESET)
        log("Docker konnte nicht installiert werden")
        exit()

# Generating Passwords
log("Generiere Passwörter")
passwords = {}
passwords["db_password"] = generate_password()
log("DB Password: " + passwords["db_password"])

# Install Dependencies
dependencies = [
    "apache2",
    "ghostscript",
    "libapache2-mod-php",
    "mysql-server",
    "php",
    "php-bcmath",
    "php-curl",
    "php-imagick",
    "php-intl",
    "php-json",
    "php-mbstring",
    "php-mysql",
    "php-xml",
    "php-zip"
]
spinner = Halo(text='Installing Dependencies', spinner='dots')
spinner.start()

for dependency in dependencies:
    try:
        subprocess.run(["apt", "install", dependency, "-y"], check=True)
        log(dependency + " wurde installiert")
    except subprocess.CalledProcessError:
        spinner.stop_and_persist(symbol='', text=colorama.Fore.RED + "[x] " + dependency + " konnte nicht installiert werden" + colorama.Fore.RESET)
        fail(dependency + " konnte nicht installiert werden")
        exit()

spinner.stop_and_persist(symbol='', text=colorama.Fore.GREEN + "[i] Abhängigkeiten installiert" + colorama.Fore.RESET)

# Install WordPress
spinner = Halo(text='Installing Wordpress', spinner='dots')
spinner.start()

# Create necessary directories and set permissions
os.system("mkdir -p /srv/www")
os.system("sudo chown www-data: /srv/www")

# Download and extract WordPress (using curl and tar)
os.system("curl -s https://wordpress.org/latest.tar.gz | sudo -u www-data tar zx -C /srv/www")
spinner.stop_and_persist(symbol='', text=colorama.Fore.GREEN + "[i] Wordpress heruntergeladen" + colorama.Fore.RESET)
log("Wordpress heruntergeladen")

# Configure Apache for WordPress
log("Apache wird konfiguriert")
apache_conf = "/etc/apache2/sites-available/wordpress.conf"
os.system(f"touch {apache_conf}")
with open(apache_conf, "w") as f:
    f.write("""<VirtualHost *:80>
    DocumentRoot /srv/www/wordpress
    <Directory /srv/www/wordpress>
        Options FollowSymLinks
        AllowOverride Limit Options FileInfo
        DirectoryIndex index.php
        Require all granted
    </Directory>
    <Directory /srv/www/wordpress/wp-content>
        Options FollowSymLinks
        Require all granted
    </Directory>
</VirtualHost>
""")
os.system("sudo a2ensite wordpress")
os.system("sudo a2enmod rewrite")
os.system("sudo a2dissite 000-default")
os.system("sudo service apache2 reload")
log("Apache konfiguriert für WordPress")

# Configure Database
log("Datenbanken werden konfiguriert")
os.system('sudo mysql -u root -p -e "CREATE DATABASE wordpress;"')
os.system(f'sudo mysql -u root -p -e "CREATE USER \'wordpress\'@\'localhost\' IDENTIFIED BY \'{passwords["db_password"]}\';"')
os.system('sudo mysql -u root -p -e "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER ON wordpress.* TO \'wordpress\'@\'localhost\';"')
os.system('sudo mysql -u root -p -e "FLUSH PRIVILEGES;"')
os.system('sudo service mysql start')
log("Datenbanken wurden konfiguriert")
log("WordPress wird mit der Datenbank verbunden")

# Configure WordPress wp-config.php
os.system("sudo -u www-data cp /srv/www/wordpress/wp-config-sample.php /srv/www/wordpress/wp-config.php")
os.system("sudo -u www-data sed -i 's/database_name_here/wordpress/' /srv/www/wordpress/wp-config.php")
os.system("sudo -u www-data sed -i 's/username_here/wordpress/' /srv/www/wordpress/wp-config.php")
os.system(f"sudo -u www-data sed -i 's/password_here/{passwords['db_password']}/' /srv/www/wordpress/wp-config.php")

# Replace authentication keys in wp-config.php using sed
os.system("sudo sed -i \"s/define('AUTH_KEY', 'put your unique phrase here');/define('AUTH_KEY', 'n[VI8c#3)G|EY_i_wmY>[n[FD?h]v`UHg|r[tao&Fh?X57P!yDy4X|40yajd');/\" /srv/www/wordpress/wp-config.php")
os.system("sudo sed -i \"s/define('SECURE_AUTH_KEY', 'put your unique phrase here');/define('SECURE_AUTH_KEY', 'L*%gA(+kR7J}hQ3rZ{Ny(yw&c3bc|TA(*.}SUjsBn$/nH2}p)h7~(vfh@1FQuOiu');/\" /srv/www/wordpress/wp-config.php")
os.system("sudo sed -i \"s/define('LOGGED_IN_KEY', 'put your unique phrase here');/define('LOGGED_IN_KEY', 'ulxQ_LiL]NiyCJ-b&|&FkDZ5/[}-]N9prkPq(0hj@cs>~0yK|71Ghwc[, (]yr-Z');/\" /srv/www/wordpress/wp-config.php")

log("WordPress wurde konfiguriert")
