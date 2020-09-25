class Notification {
    constructor(registry) {
        this.redis = registry.get('redis');
        this.ws = registry.get('webSocket');

    }

    close(id) {
        this.ws.toastClose(id);
    }

    notify(id, heading, text, percent, persistent) {

        this.ws.toast(id, heading, text, percent);
        if (persistent) {
            this.redis.sadd('notification', JSON.stringify( { id: id, heading: heading, percent: percent, text:text}));
        }
    }

    getNotifications() {

    }
}

module.exports = Notification;