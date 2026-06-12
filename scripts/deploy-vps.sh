#!/bin/bash
# ============================================================
# DEPLOY LAONGWEB KE VPS
# IP: 76.13.219.5 | User: root | Path: /root/laongweb
# ============================================================

VPS_HOST="76.13.219.5"
VPS_USER="root"
PROJECT_DIR="/root/laongweb"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- SSH ControlMaster: password cuma diminta 1x ---
SOCKET="/tmp/ssh-deploy-${VPS_HOST}"

start_ssh() {
  if [ ! -S "$SOCKET" ]; then
    echo -e "${YELLOW}[*] Membuka koneksi SSH ke ${VPS_HOST} (masukkan password 1x saja)...${NC}"
    ssh -M -f -N -o ControlMaster=yes -o ControlPath="$SOCKET" -o ControlPersist=10m "${VPS_USER}@${VPS_HOST}"
    echo -e "${GREEN}[✓] Koneksi SSH terbuka! Tidak perlu password lagi.${NC}"
  fi
}

run_vps() {
  ssh -o ControlPath="$SOCKET" "${VPS_USER}@${VPS_HOST}" "$1"
}

scp_vps() {
  scp -o ControlPath="$SOCKET" "$1" "${VPS_USER}@${VPS_HOST}:$2"
}

close_ssh() {
  ssh -O exit -o ControlPath="$SOCKET" "${VPS_USER}@${VPS_HOST}" 2>/dev/null || true
}

trap close_ssh EXIT

echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}   LAONGWEB VPS DEPLOYMENT TOOL${NC}"
echo -e "${CYAN}   VPS: ${VPS_HOST} → ${PROJECT_DIR}${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo ""

start_ssh

# --- Menu ---
show_menu() {
  echo -e "${YELLOW}Pilih aksi:${NC}"
  echo "  1) Full Deploy (git pull + rebuild + migrate)"
  echo "  2) Update Database saja (migrate / push schema)"
  echo "  3) Seed Database (jalankan seed-data.sql)"
  echo "  4) Bersihkan sampah Docker (images + build cache)"
  echo "  5) Restart containers"
  echo "  6) Lihat status containers"
  echo "  7) Lihat logs aplikasi"
  echo "  8) Full Deploy + Seed + Bersihkan sampah (SEMUA)"
  echo "  0) Keluar"
  echo ""
  echo -n "Pilihan [0-8]: "
}

# === 1. FULL DEPLOY ===
do_full_deploy() {
  echo -e "\n${CYAN}[1/3] Pull kode terbaru dari GitHub...${NC}"
  run_vps "cd ${PROJECT_DIR} && git pull origin main"

  echo -e "${CYAN}[2/3] Rebuild Docker containers...${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose build --no-cache"

  echo -e "${CYAN}[3/3] Restart containers (migrate otomatis jalan)...${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose down && docker compose up -d"

  echo -e "\n${GREEN}[✓] Full deploy selesai!${NC}"
}

# === 2. UPDATE DATABASE (SCHEMA PUSH) ===
do_migrate() {
  echo -e "\n${CYAN}[*] Menjalankan database migration (drizzle push)...${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose run --rm migrate"
  echo -e "${GREEN}[✓] Database schema updated!${NC}"
}

# === 3. SEED DATABASE ===
do_seed() {
  echo -e "\n${CYAN}[*] Menjalankan seed-data.sql ke database...${NC}"
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  SEED_FILE="${PROJECT_ROOT}/docs/seed-data.sql"

  if [ ! -f "$SEED_FILE" ]; then
    echo -e "${RED}[✗] File seed-data.sql tidak ditemukan di ${SEED_FILE}${NC}"
    return 1
  fi

  echo -e "${YELLOW}    Mengirim seed-data.sql ke VPS...${NC}"
  scp_vps "$SEED_FILE" "${PROJECT_DIR}/docs/seed-data.sql"

  echo -e "${YELLOW}    Menjalankan SQL di container database...${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose exec -T db psql -U satara -d satara < docs/seed-data.sql"

  echo -e "${GREEN}[✓] Seed database selesai!${NC}"
}

# === 4. BERSIHKAN SAMPAH DOCKER (AGRESIF) ===
do_cleanup() {
  echo -e "\n${CYAN}[*] Membersihkan sampah Docker di VPS...${NC}"

  echo -e "${CYAN}    Disk SEBELUM:${NC}"
  run_vps "df -h / | tail -1"
  echo ""

  echo -e "${YELLOW}    Menghentikan containers dulu...${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose down"

  echo -e "${YELLOW}    Menghapus images yang tidak terpakai...${NC}"
  run_vps "docker image prune -af"

  echo -e "${YELLOW}    Menghapus build cache...${NC}"
  run_vps "docker builder prune -af"

  echo -e "\n${CYAN}    Disk SESUDAH:${NC}"
  run_vps "df -h / | tail -1"

  echo -e "\n${YELLOW}    Menyalakan kembali containers...${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose up -d"

  echo -e "\n${GREEN}[✓] Selesai!${NC}"
}

# === 5. RESTART CONTAINERS ===
do_restart() {
  echo -e "\n${CYAN}[*] Restart containers...${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose restart"
  echo -e "${GREEN}[✓] Containers di-restart!${NC}"
}

# === 6. STATUS ===
do_status() {
  echo -e "\n${CYAN}[*] Status containers:${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose ps"
  echo ""
  echo -e "${CYAN}[*] Disk usage:${NC}"
  run_vps "df -h / | tail -1"
  echo ""
  echo -e "${CYAN}[*] Docker disk usage:${NC}"
  run_vps "docker system df"
}

# === 7. LOGS ===
do_logs() {
  echo -e "\n${CYAN}[*] Logs aplikasi (50 baris terakhir):${NC}"
  run_vps "cd ${PROJECT_DIR} && docker compose logs --tail=50 app"
}

# === 8. SEMUA ===
do_all() {
  do_full_deploy
  echo ""
  do_seed
  echo ""
  do_cleanup
}

# --- Main ---
while true; do
  echo ""
  show_menu
  read -r choice
  case $choice in
    1) do_full_deploy ;;
    2) do_migrate ;;
    3) do_seed ;;
    4) do_cleanup ;;
    5) do_restart ;;
    6) do_status ;;
    7) do_logs ;;
    8) do_all ;;
    0) echo -e "${GREEN}Selesai.${NC}"; exit 0 ;;
    *) echo -e "${RED}Pilihan tidak valid${NC}" ;;
  esac
done
