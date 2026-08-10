async function check() {
  try {
    const res = await fetch('http://localhost:4001/api/asesores');
    const json = await res.json();
    console.log('EVIDENCIA_API_RESPONSE:');
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
check();
