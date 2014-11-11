# nginx configuration

use default ubuntu package configuration location

- location : `/etc/nginx/sites-enabled/cloud.haroopress.com`

contents blow

```
server {
        server_name cloud.haroopress.com;

        location / {
                if ($uri ~ ^(.+)\.(eot|ttf|woff)$)
                {
                        add_header Access-Control-Allow-Origin *;
                }
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;
                proxy_pass http://127.0.0.1:3031/;
                proxy_redirect off;
        }

        location /api {
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;
                proxy_pass http://127.0.0.1:3030/api;
                proxy_redirect off;
        }

}

server {
        server_name db1.haroopress.com;
        location / {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;
                proxy_pass http://127.0.0.1:5984/;
                proxy_redirect off;
        }
}
```