# Hafif bir imaj seçiyoruz (Disk tasarrufu için slim)
FROM node:20-slim 

WORKDIR /app

# Sadece paket listelerini kopyala ve kur (Hız için)
COPY package*.json ./
RUN npm install

# Kodun tamamını kopyala
COPY . .

# Uygulamayı başlat
CMD ["npm", "start"]