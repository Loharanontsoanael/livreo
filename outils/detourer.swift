// Détoure le sujet principal d'une photo (Vision, macOS 14+).
// Usage : swift outils/detourer.swift entree.jpg sortie.png
// Produit un PNG RGBA recadré sur le sujet.
import Foundation
import Vision
import CoreImage
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else { fputs("usage : detourer.swift entree sortie.png\n", stderr); exit(1) }
let urlIn = URL(fileURLWithPath: args[1])
let urlOut = URL(fileURLWithPath: args[2])

guard let src = CGImageSourceCreateWithURL(urlIn as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
  fputs("lecture impossible\n", stderr); exit(1)
}

let requete = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([requete])
guard let resultat = requete.results?.first else {
  fputs("aucun sujet trouvé\n", stderr); exit(1)
}
let masque = try resultat.generateMaskedImage(
  ofInstances: resultat.allInstances,
  from: handler,
  croppedToInstancesExtent: true
)

let ci = CIImage(cvPixelBuffer: masque)
let ctx = CIContext()
guard let cgOut = ctx.createCGImage(ci, from: ci.extent) else {
  fputs("rendu impossible\n", stderr); exit(1)
}
guard let dest = CGImageDestinationCreateWithURL(urlOut as CFURL, UTType.png.identifier as CFString, 1, nil) else {
  fputs("écriture impossible\n", stderr); exit(1)
}
CGImageDestinationAddImage(dest, cgOut, nil)
CGImageDestinationFinalize(dest)
print("ok \(cgOut.width)x\(cgOut.height)")
