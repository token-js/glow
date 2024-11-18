# Use the official lightweight Python image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies, poetry, node, npm, and pnpm
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && pip install --no-cache-dir poetry \
    # Install Node.js and npm
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    # Install pnpm
    && npm install -g pnpm

# Copy only the package.json, package-lock.json, and prisma schema to cache dependencies
COPY package.json package-lock.json /app/
COPY prisma/schema.prisma prisma/schema.prisma
COPY assets/filler_sound.wav /app/assets/

# Copy the server directory (assuming it contains requirements.txt)
COPY /server /app/server/

# Install Python dependencies with pip
RUN pip install --no-cache-dir -r ./server/requirements.txt

# Install Node.js dependencies with pnpm
RUN npm install

# Generate Prisma client
RUN npm run prisma:generate

# Copy the entrypoint script into the container
COPY entrypoint.sh /entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /entrypoint.sh

# Expose the port that FastAPI will run on
EXPOSE 8000

# Set the entrypoint to the script
ENTRYPOINT ["/entrypoint.sh"]

# Set the default command to run the application with Uvicorn
CMD ["python", "-m", "server.livekit_worker.main", "start"]