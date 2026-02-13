# Use an official Node.js runtime as a parent image
FROM node:20.20.0-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose Mapbox token to Next.js at build and runtime
ARG MAPBOX_ACCESS_TOKEN_BUILD
ARG MAPBOX_ACCESS_TOKEN_LEGACY_BUILD
RUN echo "ARG check: length=${#MAPBOX_ACCESS_TOKEN_BUILD}, is empty: $([[ -z "$MAPBOX_ACCESS_TOKEN_BUILD" ]] && echo true || echo false), starts with space: $([[ "$MAPBOX_ACCESS_TOKEN_BUILD" =~ ^[[:space:]] ]] && echo true || echo false)" && \
    if [ -z "$MAPBOX_ACCESS_TOKEN_BUILD" ]; then \
      echo "ERROR: MAPBOX_ACCESS_TOKEN_BUILD is empty (secret not passed to build)" 1>&2; \
      exit 1; \
    else \
      echo "Verified: MAPBOX_ACCESS_TOKEN_BUILD is present (${#MAPBOX_ACCESS_TOKEN_BUILD} characters)"; \
    fi

ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=$MAPBOX_ACCESS_TOKEN_BUILD
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN_LEGACY=$MAPBOX_ACCESS_TOKEN_LEGACY_BUILD
RUN echo "ENV check: length=${#NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}, is empty: $([[ -z "$NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN" ]] && echo true || echo false)" && \
    if [ -z "$NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN" ]; then \
      echo "ERROR: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is empty after ENV" 1>&2; \
      exit 1; \
    else \
      echo "Verified: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is set for build (${#NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN} characters)"; \
    fi

# Build the Next.js application
# This command might vary slightly depending on your exact setup/needs
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
