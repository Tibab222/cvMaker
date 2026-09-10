import { Language } from "@shared/profile.interface";
import useCoverLetterContext from "../CoverLetterProvider/hook";
import { i18n } from "./i18n";

interface CoverLetterFooterProps {
  lang?: Language;
}

export default function CoverLetterFooter({
  lang = Language.ENGLISH,
}: CoverLetterFooterProps) {
  const { profileInfo } = useCoverLetterContext();
  const t = i18n[lang] ?? i18n[Language.ENGLISH];

  if (!profileInfo) return null;

  const { firstName, lastName } = profileInfo;

  return (
    <div className="mt-8 text-sm text-slate-800 font-sans space-y-4 break-inside-avoid">
      <p className="leading-relaxed">{t.signOff}</p>

      <div className="space-y-2 pt-2">
        {/* Maybe we will add it one day */}
        {/* {signatureUrl && (
          <img
            src={signatureUrl}
            alt="Signature"
            className="h-12 object-contain print:h-12"
          />
        )} */}
        <p className="font-semibold text-slate-900">
          {firstName} {lastName}
        </p>
      </div>
    </div>
  );
}