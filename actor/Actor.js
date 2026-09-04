class Actor {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'https://members.vehiclehistory.report';
    this.dashboardUrl = this.baseUrl.includes('members.vehiclehistory.report') ? `${this.baseUrl}/members/dashboard` : `${this.baseUrl}/dashboard`;
    this.myReportsUrl = this.baseUrl.includes('members.vehiclehistory.report') ? `${this.baseUrl}/members/my-reports` : `${this.baseUrl}/my-reports`;
  }

  async attemptsTo(task) {
    await task.performAs(this);
  }
}

module.exports = Actor;
