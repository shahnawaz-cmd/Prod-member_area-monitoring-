class Actor {
  constructor(page) {
    this.page = page;
  }

  async attemptsTo(task) {
    await task.performAs(this);
  }
}

module.exports = Actor;
