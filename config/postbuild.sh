# Make temp folder for assets to be copied to Docker container
mkdir temp_docker

mv dist/server.conf temp_docker/server.conf
mv dist/webchat.html temp_docker/webchat.html
mv dist/bridge.html temp_docker/bridge.html