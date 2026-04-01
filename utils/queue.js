const { sleep } = require('./helper');
const logger = require('./logger');

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Tambah task ke queue
   */
  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      if (!this.processing) this.process();
    });
  }

  /**
   * Proses queue satu per satu
   */
  async process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      try {
        const result = await task();
        resolve(result);
      } catch (err) {
        logger.error('Queue error:', err.message);
        reject(err);
      }
      // Delay antar pesan (anti-ban)
      await sleep(800, 1500);
    }
    this.processing = false;
  }

  get size() {
    return this.queue.length;
  }
}

// Singleton queue global
const globalQueue = new MessageQueue();

module.exports = globalQueue;
