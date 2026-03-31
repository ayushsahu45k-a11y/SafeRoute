const axios = require('axios');
axios.get('https://router.project-osrm.org/route/v1/bike/-122.4194,37.7749;-121.8863,37.3382')
  .then(res => console.log(res.data.code))
  .catch(err => console.error(err.response.status));
