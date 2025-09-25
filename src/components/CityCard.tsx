import styles from "~/styles/cityCard.module.css";

export function CityCard({ city }: { city: City }) {
  const place = city.state ? `${city.state}, ${city.country}` : city.country;

  const formatNumber = (number?: number | null) =>
    number ? number.toLocaleString("pt-BR") : "-";

  const formatCoord = (value?: number | null) => {
    if (value) return value.toFixed(5);
    return "-";
  };

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{city.name}</h3>
          <span className={styles.badge}>ID {city.ibgeCode ?? "-"}</span>
        </div>
        <p className={styles.subtitle}>{place}</p>
      </header>

      <dl className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <dt className={styles.metaLabel}>Latitude</dt>
          <dd className={styles.metaValue}>{formatCoord(city.lat)}</dd>
        </div>

        <div className={styles.metaItem}>
          <dt className={styles.metaLabel}>Longitude</dt>
          <dd className={styles.metaValue}>{formatCoord(city.lon)}</dd>
        </div>

        <div className={styles.metaItem}>
          <dt className={styles.metaLabel}>População</dt>
          <dd className={styles.metaValue}>{formatNumber(city.population)}</dd>
        </div>

        <div className={styles.metaItem}>
          <dt className={styles.metaLabel}>Timezone</dt>
          <dd className={styles.metaValue}>{city.timezone ?? "-"}</dd>
        </div>
      </dl>
    </div>
  );
}
