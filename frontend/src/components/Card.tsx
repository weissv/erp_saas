import React from"react";
import clsx from"clsx";

export function Card({ children, className}: { children: React.ReactNode; className?: string}) {
 return (
 <div className={clsx("mezon-card", className)}>
 {children}
 </div>
 );
}
