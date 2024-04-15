FROM ms-based-image:v1

WORKDIR /usr/app_backend

# Copy the current directory
COPY . .

# Install any needed
RUN npm install

EXPOSE 8001

ENV NODE_ENV production

# Run app.js when the container launches
CMD ["node", "server.js"]