/* Swift Connect — database: regional fare tables (Ticket_Prices.csv) */
window.DB_SEED_FARES = {
  "Notts & Derby (Purple Line / Robin Hood)": {
    opExPerBus: 713.00,
    tickets: [
      { name: "Adult Single", price: 3.2, pax: 62, factor: 1 },
      { name: "Purple Line Single", price: 3.0, pax: 26, factor: 1 },
      { name: "Adult Short", price: 2.4, pax: 46, factor: 1 },
      { name: "Child Single", price: 1.6, pax: 21, factor: 1 },
      { name: "Adult Day", price: 6.8, pax: 36, factor: 1 },
      { name: "Purple Line Rover", price: 5.8, pax: 13, factor: 1 },
      { name: "Child Day", price: 4.2, pax: 9, factor: 1 },
      { name: "Adult Weekly (÷7)", price: 25.0, pax: 6, factor: 1/7 },
      { name: "Purple Line Week (÷7)", price: 22.0, pax: 3, factor: 1/7 },
      { name: "Child Weekly (÷7)", price: 14.5, pax: 2, factor: 1/7 },
      { name: "Adult Month (÷28)", price: 88.0, pax: 1, factor: 1/28 },
      { name: "Child Month (÷28)", price: 56.0, pax: 0.2, factor: 1/28 },
      { name: "Robin Hood Ticket", price: 3.0, pax: 16, factor: 1 },
      { name: "Concessionary (Free Pass)", price: 1.7, pax: 58, factor: 1 },
      { name: "Family/Group Day Saver", price: 16.0, pax: 5, factor: 1 },
      { name: "Student Day", price: 4.8, pax: 12, factor: 1 }
    ]
  },
  "Telford & Wrekin (Hadley / Wellington / PRH)": {
    opExPerBus: 753.00,
    tickets: [
      { name: "Adult Single", price: 2.2, pax: 55, factor: 1 },
      { name: "Adult Return", price: 3.8, pax: 25, factor: 1 },
      { name: "Adult Day Saver", price: 4.5, pax: 20, factor: 1 },
      { name: "Adult Weekly (÷7)", price: 16.5, pax: 4, factor: 1/7 },
      { name: "Adult 4 Weekly (÷28)", price: 55.0, pax: 2, factor: 1/28 },
      { name: "Child Single", price: 1.1, pax: 35, factor: 1 },
      { name: "Child Return", price: 1.8, pax: 12, factor: 1 },
      { name: "Child Day Saver", price: 2.2, pax: 18, factor: 1 },
      { name: "ENCTS Concessionary", price: 1.8, pax: 85, factor: 1 },
      { name: "Shopper Hopper Day", price: 3.2, pax: 15, factor: 1 },
      { name: "Council Subsidy", price: 40.0, pax: 1, factor: 1 },
      { name: "Tesco Subsidy", price: 25.0, pax: 1, factor: 1 },
      { name: "PRH Hospital Return", price: 3.6, pax: 14, factor: 1 },
      { name: "Wrekin Group Family Pass", price: 9.0, pax: 8, factor: 1 }
    ]
  },
  "West Midlands & Black Country (Dudley / Willenhall / X807)": {
    opExPerBus: 735.35,
    tickets: [
      { name: "Adult Single", price: 3.2, pax: 55, factor: 1 },
      { name: "Adult Return", price: 5.0, pax: 30, factor: 1 },
      { name: "Adult Short", price: 1.6, pax: 35, factor: 1 },
      { name: "Child Single", price: 1.6, pax: 25, factor: 1 },
      { name: "Child Return", price: 2.5, pax: 15, factor: 1 },
      { name: "Adult Day", price: 5.5, pax: 45, factor: 1 },
      { name: "Child Day", price: 2.75, pax: 15, factor: 1 },
      { name: "Concessionary (Free Pass)", price: 1.85, pax: 95, factor: 1 },
      { name: "nBus Ticket Acceptance", price: 2.0, pax: 75, factor: 1 },
      { name: "Black Country Group Saver", price: 12.0, pax: 8, factor: 1 },
      { name: "X807 Intercity Single", price: 16.0, pax: 22, factor: 1 },
      { name: "X807 Intercity Return", price: 26.0, pax: 14, factor: 1 }
    ]
  },
  "South London (Elmers End / TfL)": {
    opExPerBus: 716.33,
    tickets: [
      { name: "Adult Single (Hopper)", price: 1.75, pax: 145, factor: 1 },
      { name: "Adult Short", price: 1.75, pax: 40, factor: 1 },
      { name: "Child Single", price: 0.85, pax: 65, factor: 1 },
      { name: "Adult Day Cap", price: 5.25, pax: 90, factor: 1 },
      { name: "Child Day", price: 2.6, pax: 35, factor: 1 },
      { name: "TfL Reimbursement", price: 1.8, pax: 185, factor: 1 },
      { name: "One Day Paper Bus Pass", price: 6.0, pax: 20, factor: 1 },
      { name: "Freedom Pass / ENCTS Reimb.", price: 1.8, pax: 120, factor: 1 }
    ]
  },
  "Wales & UT Coach (Talbot Green / Wrexham / Colwyn Bay)": {
    opExPerBus: 721.10,
    tickets: [
      { name: "Adult Single", price: 4.6, pax: 40, factor: 1 },
      { name: "Adult Return", price: 6.8, pax: 25, factor: 1 },
      { name: "Adult Day", price: 7.5, pax: 25, factor: 1 },
      { name: "UT Coach Single", price: 26.5, pax: 20, factor: 1 },
      { name: "UT Coach Return", price: 45.0, pax: 12, factor: 1 },
      { name: "UT Coach Short Commute", price: 10.0, pax: 14, factor: 1 },
      { name: "UT Student Link Day", price: 7.8, pax: 32, factor: 1 },
      { name: "Welsh Conc. (Free Pass)", price: 2.2, pax: 90, factor: 1 },
      { name: "mytravelpass (16-21)", price: 1.0, pax: 42, factor: 1 },
      { name: "Welsh Explorer Group Saver", price: 16.0, pax: 8, factor: 1 }
    ]
  },
  "Swift Connecting Railway": {
    opExPerBus: 4400.00,
    tickets: [
      { name: "End-to-End Single", price: 19.5, pax: 82, factor: 1 },
      { name: "Local Hop Single", price: 3.8, pax: 165, factor: 1 },
      { name: "Anytime Return", price: 28.0, pax: 72, factor: 1 },
      { name: "Off-Peak Day Return", price: 15.0, pax: 145, factor: 1 },
      { name: "Weekly Season (÷7)", price: 62.0, pax: 24, factor: 1/7 },
      { name: "Monthly Season (÷28)", price: 225.0, pax: 12, factor: 1/28 },
      { name: "Student Term Pass", price: 1.5, pax: 65, factor: 1 },
      { name: "Senior Railcard", price: 9.8, pax: 88, factor: 1 },
      { name: "GroupSaver Day Pass", price: 35.0, pax: 15, factor: 1 },
      { name: "Standard Premium Upgrade", price: 24.0, pax: 18, factor: 1 }
    ]
  }
};
