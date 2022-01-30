FROM grafana/agent:main

VOLUME [ "/tmp/agent" ]

COPY agent/config/agent.yaml /etc/agent-config/

ENTRYPOINT [ "/bin/agent", "-config.file=/etc/agent-config/agent.yaml", "-prometheus.wal-directory=/tmp/agent/wal", "-config.expand-env", "-config.enable-read-api" ]