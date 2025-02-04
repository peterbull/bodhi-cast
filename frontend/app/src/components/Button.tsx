interface ButtonProps {
  text: string;
  onClick?: () => void;
  ref?: React.ForwardedRef<HTMLButtonElement>;
}

export function Button({onClick, ref, text}: ButtonProps) {
         return ( 
          <>
            <div className="flex justify-center items-center h-full pt-4">
              <button
                ref={ref}
                onClick={onClick ?? undefined}
                className="text-neon focus:text-lightneon hover:text-hoverneon focus:bg-focusbg uppercase-tracking-[4px] border-2 border-neon rounded px-6 py-2 mx-4">
                {text}
              </button>
            </div>
          </> )
}