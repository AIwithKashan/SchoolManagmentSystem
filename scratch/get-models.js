async function getFreeModels() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const data = await res.json();
    const freeModels = data.data
      .filter(m => m.id.endsWith(':free') || m.pricing.prompt === '0')
      .map(m => ({ id: m.id, name: m.name, promptPrice: m.pricing?.prompt }));
    console.log(JSON.stringify(freeModels, null, 2));
  } catch (err) {
    console.error("Failed to fetch models:", err.message);
  }
}

getFreeModels();
