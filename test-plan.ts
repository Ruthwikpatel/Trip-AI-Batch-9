import axios from 'axios';

async function test() {
  try {
    const response = await axios.post('http://localhost:3000/api/plan-trip', {
      destination: 'Goa',
      days: 3,
      budget: 10000,
      people: 2,
      interests: ['Food'],
      transport: 'flight'
    });
    console.log('Success:', response.data);
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

test();
