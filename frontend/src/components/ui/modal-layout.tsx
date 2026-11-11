import * as React from "react";

/** Keep the heading outside the scrollable body, including in long forms. */
export function ModalLayout({
  children,
  headerType,
}: {
  children: React.ReactNode;
  headerType: React.ElementType;
}) {
  const items = React.Children.toArray(children);
  const header = items.find((child) => React.isValidElement(child) && child.type === headerType);

  if (!header) return <>{children}</>;

  return (
    <>
      <div className="shrink-0">{header}</div>
      <div className="-mx-6 -mb-6 grid min-h-0 gap-4 overflow-y-auto overscroll-contain px-6 pb-6">
        {items.filter((child) => child !== header)}
      </div>
    </>
  );
}
