import React, { useEffect, useState } from "react";

function App() {
  const [products, setProducts] = useState([]);
  const [carrello, setCarrello] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("Errore nel caricamento prodotti:", err));
  }, []);

  const aggiungiAlCarrello = (id, quantita) => {
    setProducts((prevProducts) => {
      const prodotto = prevProducts.find((p) => p.id === id);
      if (!prodotto) return prevProducts;

      const nelCarrello = carrello[id] || 0;
      const quantitaDisponibile = prodotto.quantita_disponibile + nelCarrello;
      const nuovaQuantitaNelCarrello = nelCarrello + quantita;

      if (nuovaQuantitaNelCarrello > quantitaDisponibile) {
        alert(
          `Puoi aggiungere al massimo ${
            quantitaDisponibile - nelCarrello
          } unità`
        );
        return prevProducts;
      }

      setCarrello((prevCarrello) => ({
        ...prevCarrello,
        [id]: nuovaQuantitaNelCarrello,
      }));

      return prevProducts.map((p) =>
        p.id === id
          ? { ...p, quantita_disponibile: p.quantita_disponibile - quantita }
          : p
      );
    });
  };

  const rimuoviDalCarrello = (id, quantita) => {
    setCarrello((prevCarrello) => {
      const currentQty = prevCarrello[id] || 0;
      const newQty = Math.max(0, currentQty - quantita);

      if (newQty === 0) {
        const { [id]: _, ...rest } = prevCarrello;
        return rest;
      }

      return { ...prevCarrello, [id]: newQty };
    });

    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === id
          ? { ...p, quantita_disponibile: p.quantita_disponibile + quantita }
          : p
      )
    );
  };

  // Calcola il totale dell'ordine con eventuale sconto
  const calcolaTotaleOrdine = () => {
    let subtotale = 0;

    for (const [id, qty] of Object.entries(carrello)) {
      const prodotto = products.find((p) => p.id === parseInt(id));
      if (prodotto) {
        subtotale += Number(prodotto.prezzo) * qty; // <-- Number() qui
      }
    }

    // Applica sconto del 10% se il totale supera €100
    const sconto = subtotale > 100 ? subtotale * 0.1 : 0;
    const totale = subtotale - sconto;

    return { subtotale, sconto, totale };
  };

  // Funzione per salvare l'ordine
  const salvaOrdine = async () => {
    if (Object.keys(carrello).length === 0) {
      alert("Il carrello è vuoto!");
      return;
    }

    setIsSaving(true);
    setOrderResult(null);

    try {
      // Prepara i dati per l'invio
      const orderData = {
        items: Object.entries(carrello).map(([id, quantity]) => ({
          productId: parseInt(id),
          quantity,
        })),
      };

      // Invia i dati al backend
      const response = await fetch("http://localhost:3001/save-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        setOrderResult({
          success: true,
          message: `Ordine salvato con successo! ID: ${result.orderId}`,
          orderId: result.orderId,
        });

        // Svuota il carrello dopo il salvataggio
        setCarrello({});
      } else {
        setOrderResult({
          success: false,
          message: result.error || "Errore durante il salvataggio dell'ordine",
        });
      }
    } catch (error) {
      setOrderResult({
        success: false,
        message: `Errore di connessione: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <h1>Lista Prodotti</h1>
      <ul className="list-group">
        {products.map((p) => (
          <li
            key={p.id}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <div>
              <strong>{p.nome}</strong> – €{Number(p.prezzo).toFixed(2)} –
              Disponibili: {p.quantita_disponibile}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => aggiungiAlCarrello(p.id, 1)}
              disabled={p.quantita_disponibile === 0}
            >
              Aggiungi 1
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mt-5">Carrello</h2>
      {Object.keys(carrello).length === 0 ? (
        <p>Il carrello è vuoto</p>
      ) : (
        <div>
          <ul className="list-group mb-3">
            {Object.entries(carrello).map(([id, qty]) => {
              const prodotto = products.find((p) => p.id === parseInt(id));
              const subtotale = prodotto ? Number(prodotto.prezzo) * qty : 0;

              return (
                <li
                  key={id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    {prodotto ? prodotto.nome : "Prodotto sconosciuto"} × {qty}{" "}
                    – €{subtotale.toFixed(2)}
                  </div>
                  <div>
                    <button
                      className="btn btn-danger btn-sm mr-2"
                      onClick={() => rimuoviDalCarrello(parseInt(id), 1)}
                    >
                      Rimuovi 1
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Riepilogo dell'ordine */}
          <div className="card">
            <div className="card-header">
              <h5>Riepilogo Ordine</h5>
            </div>
            <div className="card-body">
              {Object.entries(carrello).map(([id, qty]) => {
                const prodotto = products.find((p) => p.id === parseInt(id));
                const subtotale = prodotto ? Number(prodotto.prezzo) * qty : 0;

                return (
                  <div key={id} className="mb-2">
                    {prodotto ? prodotto.nome : "Prodotto sconosciuto"} × {qty}{" "}
                    – €{subtotale.toFixed(2)}
                  </div>
                );
              })}

              <hr />

              <div className="font-weight-bold">
                <div>
                  Subtotale: €
                  {Number(calcolaTotaleOrdine().subtotale).toFixed(2)}
                </div>
                {calcolaTotaleOrdine().sconto > 0 && (
                  <div className="text-success">
                    Sconto (10%): -€
                    {Number(calcolaTotaleOrdine().sconto).toFixed(2)}
                  </div>
                )}
                <div className="mt-2 h5">
                  Totale ordine: €
                  {Number(calcolaTotaleOrdine().totale).toFixed(2)}
                </div>
              </div>

              {/* Pulsante per salvare l'ordine */}
              <div className="mt-3">
                <button
                  className="btn btn-success"
                  onClick={salvaOrdine}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvataggio in corso..." : "Completa Ordine"}
                </button>

                {/* Messaggio di risultato */}
                {orderResult && (
                  <div
                    className={`mt-3 alert ${
                      orderResult.success ? "alert-success" : "alert-danger"
                    }`}
                  >
                    {orderResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
