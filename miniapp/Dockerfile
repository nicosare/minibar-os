FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY styles /usr/share/nginx/html/styles
COPY src /usr/share/nginx/html/src
COPY legacy /usr/share/nginx/html/legacy
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
