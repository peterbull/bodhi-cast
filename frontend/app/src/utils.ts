export type FormattedDate = string & { readonly brand: unique symbol };
export function getFormattedDate(): FormattedDate {
  /**
   * Returns the date as a string formatted YYYYMMDD
   */
  const now: Date = new Date();

  return (now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0")) as FormattedDate;
}
