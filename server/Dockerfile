# Use Ubuntu 20.04 LTS as the base image
# FROM ubuntu:22.04 AS stage-one
FROM node:latest

# Update package lists
# RUN apt-get update -y

# # Install necessary packages
# RUN apt-get install -y curl 
# RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash 
# RUN apt-get install -y nodejs


# # Set working directory
WORKDIR /app

# # Copy package.json and yarn.lock files
COPY . .
# COPY package*.json ./
# COPY yarn*.lock ./
# COPY mediasoup mediasoup

# # Install Node.js dependencies
RUN MEDIASOUP_WORKER_BIN="/app/mediasoup/mediasoup-worker" npm install

# Copy application code

# # Set the entry point command
ENTRYPOINT MEDIASOUP_WORKER_BIN="/app/mediasoup/mediasoup-worker" npm start
