FROM node:20

# Create app directory
WORKDIR /yelpcamp

# Copy package files and install dependencies first
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Expose app port
EXPOSE 3000

# Use environment variables from .env
CMD ["npm", "start"]
