export default function DashboardPage() {
  const rows = [
    { id: 1, name: "Producto A", qty: 12, price: 19.9 },
    { id: 2, name: "Producto B", qty: 5,  price: 9.5 },
    { id: 3, name: "Producto C", qty: 2,  price: 149 },
  ];

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">PAGINA EJEMPLO FORMULARIOS PARA ADMINISTRADORES</h1>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-right">Cantidad</th>
              <th className="px-3 py-2 text-right">Precio</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-right">{r.qty}</td>
                <td className="px-3 py-2 text-right">{r.price.toFixed(2)} €</td>
                <td className="px-3 py-2 text-right">{(r.qty * r.price).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}