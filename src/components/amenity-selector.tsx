import { amenityGroups, amenityOptions } from "@/lib/market";

export function AmenitySelector({ selected = [], className = "" }: { selected?: string[]; className?: string }) {
  const knownOptions = new Set<string>(amenityOptions);
  const extraOptions = selected.filter((amenity) => !knownOptions.has(amenity));
  const groups: { title: string; items: readonly string[] }[] = [
    ...amenityGroups,
    ...(extraOptions.length ? [{ title: "Other saved amenities", items: extraOptions }] : []),
  ];

  return <fieldset className={`amenity-selector ${className}`.trim()}>
    <legend>Amenities <span>Choose all that apply</span></legend>
    <div className="amenity-selector-groups">
      {groups.map((group) => <section key={group.title}>
        <strong>{group.title}</strong>
        <div>{group.items.map((amenity) => <label key={amenity}>
          <input type="checkbox" name="amenities" value={amenity} defaultChecked={selected.includes(amenity)} />
          <span>{amenity}</span>
        </label>)}</div>
      </section>)}
    </div>
  </fieldset>;
}
