// Recadre un PNG en préservant la transparence.
// Usage : swift outils/recadrer.swift entree.png sortie.png x y largeur hauteur
// (x, y depuis le coin haut-gauche, en pixels)
import Foundation
import CoreImage
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count >= 7, let x = Int(a[3]), let y = Int(a[4]), let l = Int(a[5]), let h = Int(a[6]) else {
  fputs("usage : recadrer.swift in out x y largeur hauteur\n", stderr); exit(1)
}
guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil),
      let coupe = cg.cropping(to: CGRect(x: x, y: y, width: l, height: h)) else {
  fputs("recadrage impossible\n", stderr); exit(1)
}
guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else {
  fputs("écriture impossible\n", stderr); exit(1)
}
CGImageDestinationAddImage(dest, coupe, nil)
CGImageDestinationFinalize(dest)
print("ok \(coupe.width)x\(coupe.height)")
