const images: Record<string, string> = {
  cuisine:
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
  dressing:
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
  placard:
    "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=80",
  bathroom:
    "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80",
  other:
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
};

const labels: Record<string, string> = {
  cuisine: "Cuisine",
  dressing: "Dressing",
  placard: "Placard",
  bathroom: "Salle de bain",
  "salle-de-bain": "Salle de bain",
  other: "Agencement",
};

function normalize(type?: string) {
  return (type ?? "").trim().toLowerCase();
}

export function projectImage(type?: string) {
  return images[normalize(type)] ?? images.other;
}

export function projectTypeLabel(type?: string) {
  const key = normalize(type);
  if (!key) return labels.other;
  return labels[key] ?? type ?? labels.other;
}
