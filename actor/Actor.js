class Actor {
  constructor(page) {
    this.page = page;
    this.baseUrl = (process.env.BASE_URL || 'https://members.vehiclehistory.report').replace(/\/+$/, '');
    const hasMembers = this.baseUrl.endsWith('/members') || this.baseUrl.includes('members.vehiclehistory.report');
    this.dashboardUrl = hasMembers ? (this.baseUrl.endsWith('/members') ? `${this.baseUrl}/dashboard` : `${this.baseUrl}/members/dashboard`) : `${this.baseUrl}/dashboard`;
    this.myReportsUrl = hasMembers ? (this.baseUrl.endsWith('/members') ? `${this.baseUrl}/my-reports` : `${this.baseUrl}/members/my-reports`) : `${this.baseUrl}/my-reports`;
  }

  async attemptsTo(task) {
    await task.performAs(this);
  }
}

module.exports = Actor;
