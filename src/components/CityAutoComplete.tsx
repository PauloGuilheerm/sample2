import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { api } from "~/utils/api";
import { useDebounce } from "~/hooks/useDebounce";
import { CityCard } from "./CityCard";
import styles from "~/styles/cityAutocomplete.module.css";

export function CityAutocomplete() {
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<City | null>(null);
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const cityDebounced = useDebounce(city, 500);
  const enabled = cityDebounced.length >= 3;

  const { data, isFetching } = api.city.autocomplete.useQuery(
    { text: cityDebounced, limit: 8 },
    { enabled, staleTime: 60_000 }
  );

  useEffect(() => {
    setOpen(enabled && !!data?.length);
  }, [enabled, data]);

  const list = useMemo(() => data ?? [], [data]);

  const handleCityText = (e: ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value);
    setSelected(null);
    if (!open) setOpen(true);
  };

  const handleSelectCity = (c: City) => {
    setSelected(c);
    setCity(c.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setCity("");
    setSelected(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.layout}>
      <div className={styles.leftCol}>
        <label className={styles.label} htmlFor="city-input">Cidade</label>

        <div className={styles.inputWrapper}>
          <span className={styles.inputIcon} aria-hidden>🔎</span>
          <input
            id="city-input"
            ref={inputRef}
            value={city}
            onChange={handleCityText}
            onFocus={() => setOpen(true)}
            placeholder="Digite o nome da cidade..."
            className={styles.input}
          />
          {city && (
            <button type="button" onClick={handleClear} className={styles.clearBtn} aria-label="Limpar">
              ×
            </button>
          )}
        </div>

        {open && (
          <div className={styles.panelInline}>
            {isFetching && <div className={styles.loading}>Carregando…</div>}
            {!isFetching && list.length === 0 && (
              <div className={styles.empty}>Nenhuma cidade encontrada.</div>
            )}
            {!isFetching && list.length > 0 && (
              <ul className={styles.list}>
                {list.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={styles.item} onClick={() => handleSelectCity(c)}>
                      <span className={styles.itemPrimary}>{c.name}</span>
                      <span className={styles.itemSecondary}>
                        {c.state ? `${c.state}, ` : ""}{c.country ?? "Brasil"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={styles.rightCol}>
        {selected && <CityCard city={selected} />}
      </div>
    </div>
  );
}
