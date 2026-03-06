const http = require('http');

http.get('http://localhost:5000/api/products', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log('Status Code:', res.statusCode);
    console.log(`Success: ${parsed.success}, Total Products: ${parsed.data ? parsed.data.total : 0}`);
    if (parsed.data && parsed.data.products && parsed.data.products.length > 0) {
        console.log('Sample Product Name:', parsed.data.products[0].name);
        console.log('Sample Product Original Price:', parsed.data.products[0].price);
        console.log('Sample Product Discounted Price:', parsed.data.products[0].discountedPrice);
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
