import { Link } from "react-router-dom";

interface AwignLogoProps {
  className?: string;
}

const AwignLogo = ({ className = "" }: AwignLogoProps) => {
  return (
    <Link to="/" className={`flex items-center hover:opacity-90 transition-opacity flex-shrink-0 ${className}`}>
      <img 
        src="/Logo.png" 
        alt="Awign Logo" 
        className="max-h-9 w-auto object-contain flex-shrink-0"
        style={{ 
          maxWidth: 'min(150px, 20vw)',
          height: 'auto'
        }}
      />
    </Link>
  );
};

export default AwignLogo;

