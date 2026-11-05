"use strict";
const EXPLORER = [
  { id: "airplane", label: "Airplane" },
  { id: "keyboard", label: "Keyboard" },
  { id: "sandwich", label: "Sandwich" },
  { id: "octopus", label: "Octopus" },
  { id: "bridge", label: "Bridge" },
  { id: "battleship", label: "Battleship" },
];
const PLAYGROUND = [
  { id: "pineapple", label: "Pineapple", start: "pineapple/body" },
  { id: "oyster", label: "Oyster", start: null },
];

const LOOKS = {
  paper:  { bg: ["#ffffff", "#e9ecf0"], clay: [0.24, 0.25, 0.27], dim: [0.62, 0.63, 0.65],
            hemi: 0.3, key: 1.25, fill: 0.3, rim: 0.0, env: 0.25, shadow: 0.09, exposure: 1.0,
            cavValley: 0.42, cavRidge: 0.28, stepLine: 0.45 },
};
const HOT = [0.90, 0.42, 0.06];
const currentLook = "paper";

const EDIT_STEPS = [
  { label: "Generated" },
  { label: "Edit 1", text: "change time = 3:50" },
  { label: "Edit 2", text: "add numbers on dial" },
  { label: "Edit 3", text: "change numbers on dial as per photo", photo: "static/images/edits/numbers_photo.webp" },
  { label: "Edit 4", text: "change dial as per photo", photo: "static/images/edits/skeleton_photo.webp" },
];
const WATCH_VIEW = [0.15, 1.0, 0.75];

const GALLERY = [
  { slug: "guitar-claude", label: "Electric guitar", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The electric guitar has an asymmetrical body with two cutaways for easier access to higher frets. The neck extends to the headstock, which houses six tuning pegs. The bridge, near the bottom, anchors the strings. Two humbucker pickups are located under the strings, and control knobs for volume and tone, along with a pickup selector switch, are on the lower half of the body. An output jack for connecting to an amplifier is also included. The guitar is mostly symmetric." },
  { slug: "pomegranate-claude", label: "Pomegranate", model: "SurfScaff3D", ds: "OmniObject3D",
    prompt: "The 3D model is a pomegranate with a rounded, slightly asymmetrical shape. It has a textured rind with dark spots and patches, and a cluster of elongated stems at the top. The model is isolated, focusing only on the pomegranate." },
  { slug: "donut-kimi", label: "Donut", model: "SurfScaff3D-K", ds: "OmniObject3D",
    prompt: "The 3D model is a donut with sprinkles. It has a circular shape with a hole in the middle and smooth edges. The top is slightly curved and covered with frosting. Sprinkles, small and round, are scattered across the frosting. The donut is set against a plain background. To create the model, start with a circular base, add a frosting layer, and place sprinkles randomly." },
  { slug: "headphones-claude", label: "Headphones", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The 3D model is a pair of headphones with circular ear cups and an arched headband. The ear cups are larger than the headband. The outer sides of the ear cups have geometric patterns. The inner part of each ear cup is diamond-like. The ear pads are comfortable. The headphones are shown against a plain background." },
  { slug: "cupcake-kimi", label: "Cupcake", model: "SurfScaff3D-K", ds: "Toys4K",
    prompt: "The 3D model is a cupcake with a cylindrical base and a swirled frosting on top. The frosting has a swirled pattern. Chocolate chips are scattered on the frosting. Three lollipops with striped patterns are inserted into the frosting at different angles. The cupcake base has stripes. The lollipops have striped patterns." },
  { slug: "lollipop-claude", label: "Lollipop", model: "SurfScaff3D", ds: "OmniObject3D",
    prompt: "The 3D model is a lollipop with a candy head, a stick, and wrapping paper. The candy head is an irregular sphere, resembling a fruit. The stick is a straight cylinder. The wrapping paper is twisted at the base, creating a slight bulge." },
  { slug: "classical-column-kimi", label: "Classical column", model: "SurfScaff3D-K", ds: "Toys4K",
    prompt: "The 3D model is a classical column, either Ionic or Doric, with an elegant design and detailed ornamentation. It is cylindrical and tapers slightly towards the top. The capital has symmetrical volutes that curl outward, and the shaft is fluted with vertical grooves. The base is symmetrical for stability. The column is designed to stand prominently in grand public buildings." },
  { slug: "shopping-basket-claude", label: "Shopping basket", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The 3D model is a rectangular shopping basket with a grid pattern of small square holes on the side panels for ventilation. It has a design for easy carrying and is positioned centrally against a background." },
  { slug: "trash-can-claude", label: "Trash can", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The 3D model is a modern trash can with a conical shape and a slightly flared opening at both ends. It has a tall, cylindrical body with a circular rim at the top and a mesh-like texture created by vertical and horizontal bars. The design is simple and functional, suitable for public spaces such as parks and commercial areas." },
  { slug: "jellyfish-claude", label: "Jellyfish", model: "SurfScaff3D", ds: "our prompt", blocksFrom: "jellyfish" },
  { slug: "motherboard-claude", label: "Motherboard", model: "SurfScaff3D", ds: "our prompt", blocksFrom: "motherboard" },
  { slug: "piano-claude", label: "Grand piano", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The grand piano has a curved, elongated shape that narrows at one end. It features a wing-like structure on the sides, carvings, and a keyboard with keys. The legs are cylindrical, and the music desk is present. The interior of the lid is textured. The piano is symmetrical and well-proportioned." },
  { slug: "rifle-claude", label: "Rifle", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The 3D model is a rifle with a long, straight barrel and a curved stock for shoulder support. The magazine is a rectangular prism that sticks out below the action. The trigger assembly is detailed, and the handguard is segmented. The iron sights and rear sight base have angular designs. The rifle is symmetrically balanced." },
  { slug: "loudspeaker-claude", label: "Loudspeaker", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The loudspeaker is circular with a conical cone that narrows to a central dust cap. The cone is durable. The dust cap can match or contrast the cone. A flexible spider suspension ring controls the cone's movement. The voice coil, a cylindrical wire, is inside the magnetic field. The basket, the outer frame, supports all parts. The surround, a flexible ring, connects the cone to the basket." },
  { slug: "boat-claude", label: "Boat", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The 3D model is a classic boat with a streamlined hull and a pointed bow. The hull and deck are present. The boat has evenly spaced windows along the sides, framed. The interior cabin includes seating, tables, and storage compartments. The stern may have an engine compartment. The boat is symmetrically designed with a balanced length-to-width ratio and curved lines at the bow." },
  { slug: "motorcycle-claude", label: "Chopper motorcycle", model: "SurfScaff3D", ds: "ShapeNet",
    prompt: "The custom chopper motorcycle has a long, low frame with an extended front fork. The engine block is present, and the fuel tank is present. The front and rear fenders are present, with the rear fender partially covering the back wheel. The saddle is high and narrow. The handlebars and exhaust pipes are present. The spoked wheels have rims and tires with tread patterns. The side covers are present. The tires are slightly wider at the rear." },
  { slug: "chair-claude", label: "Office chair", model: "SurfScaff3D", ds: "Toys4K",
    prompt: "The 3D model is a modern office chair. It has a rectangular seat with rounded edges and a high, slightly curved backrest for support. The chair features straight armrests at a comfortable height and a five-pointed star base with casters for easy movement. The design is symmetrical and balanced, perfect for a professional office." },
  { slug: "butterfly-claude", label: "Monarch butterfly", model: "SurfScaff3D", ds: "Toys4K",
    prompt: "The 3D model is a Monarch Butterfly with large wings that have margins and spots. The body is cylindrical and segmented. Two thin, elongated antennae extend from the head, slightly curved at the tips. The model is isolated against a background." },
  { slug: "volleyball-claude", label: "Volleyball", model: "SurfScaff3D", ds: "Toys4K",
    prompt: "The 3D model is a spherical indoor volleyball with six rectangular panels. Three panels are one color, two are another color, and one is a third color. The panels have rounded edges and meet smoothly at the equator. The ball is symmetrical and is displayed against a solid background." },
  { slug: "corn-claude", label: "Corn", model: "SurfScaff3D", ds: "OmniObject3D",
    prompt: "The 3D model is of an ear of corn with some of the husk peeled back. The corn kernels are arranged in rows along the cob, which is slightly elongated and cylindrical. The kernels are arranged in rows along the cob. The husk is partially covering the kernels. The husk has visible striations. The cob tapers to a point at one end and is rounded at the other." },
  { slug: "picnic-basket-claude", label: "Picnic basket", model: "SurfScaff3D", ds: "OmniObject3D",
    prompt: "The 3D model is a basket with a cylindrical shape, wider at the base and flared at the top. It has a tight weave pattern and two slender handles on the top rim. A removable lid with the same weave pattern covers the top. The height is roughly half the base diameter." },
  { slug: "oyster-claude", label: "Oyster", model: "SurfScaff3D", ds: "OmniObject3D",
    prompt: "The 3D model shows an open oyster shell with the oyster meat and green garnish. The shell has a rougher exterior and a smoother interior with grooves. The oyster meat is fleshy and moist. Green herbs are scattered over the oyster meat. The shell has a slightly asymmetrical shape." },
  { slug: "shrimp-claude", label: "Shrimp", model: "SurfScaff3D", ds: "OmniObject3D",
    prompt: "The shrimp model is a curved, elongated shape divided into three main parts: the head, middle section, and tail. It has protruding eyes, small sensory appendages, and several pairs of walking legs. The tail curves backward. The antennae and eyes are present." },
  { slug: "starfish-claude", label: "Starfish", model: "SurfScaff3D", ds: "OmniObject3D",
    prompt: "The 3D model is a starfish with a thick central disk and five arms. Each arm is slightly curved and tapers to a point. To create the model, start with a circular central disk and extend five arms. Apply a textured map with nodular patterns and use shading to add depth." },
];
