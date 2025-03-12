import colorama
import distro
from halo import Halo
import socket
import os

def log(text):
    with open("install.log", "a") as f:
        f.write(text + "\n")
    print(colorama.Fore.GREEN + "[*] " + text + colorama.Fore.RESET)

def fail(text):
    print(colorama.Fore.RED + "[x] " + text + colorama.Fore.RESET)

colorama.init()

print(colorama.Fore.BLUE + """
████████╗███████╗      ██████╗ 
╚══██╔══╝██╔════╝      ██╔══██╗
   ██║   ███████╗█████╗██║  ██║
   ██║   ╚════██║╚════╝██║  ██║
   ██║   ███████║      ██████╔╝
   ╚═╝   ╚══════╝      ╚═════╝ 
                               
-----------------------------------------------------
Tech Support Skript
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

# Create root user 
def create_ts_deamon_user():
    os.system("useradd -m -G sudo ts-deamon")
    os.system("echo 'ts-deamon:xyz' | chpasswd")
    os.system("echo 'ts-deamon ALL=(ALL) NOPASSWD:ALL' | tee -a /etc/sudoers.d/ts-deamon")
    log("Der Benutzer ts-deamon wurde erstellt")

def setup_ssh():
    os.system("apt-get install -y openssh-server")
    os.system("systemctl enable ssh")
    os.system("systemctl start ssh")
    log("SSH wurde konfiguriert")