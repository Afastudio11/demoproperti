#!/usr/bin/env bash
# ============================================================
# SCRIPT UNTUK MEMBERSIHKAN DATA PROYEK DI VPS LAONGWEB
# KECUALI DATA HR, USERS, DAN SESSIONS
# ============================================================

VPS_HOST="76.13.219.5"
VPS_USER="root"
SOCKET="/tmp/ssh-clear-db-${VPS_HOST}"

echo "Membuka koneksi SSH ke VPS (masukkan password VPS jika diminta)..."
ssh -M -f -N -o ControlMaster=yes -o ControlPath="$SOCKET" -o ControlPersist=5m "${VPS_USER}@${VPS_HOST}"

echo "Menghapus data proyek, progress unit, dll. (kecuali data HR, users, dan sessions)..."

# Menggunakan single-quoted heredoc ('EOF') agar bash tidak mengekspansi '$$' menjadi PID shell
ssh -o ControlPath="$SOCKET" "${VPS_USER}@${VPS_HOST}" "docker exec -i laongweb-db-1 psql -U satara -d satara" << 'EOF'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE 'hr_%' 
          AND tablename NOT IN ('app_users', 'user_sessions')
    ) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE;';
    END LOOP;
END $$;
EOF

echo "Menutup koneksi SSH..."
ssh -O exit -o ControlPath="$SOCKET" "${VPS_USER}@${VPS_HOST}" 2>/dev/null || true

echo "Pembersihan database selesai!"
